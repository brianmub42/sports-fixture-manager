import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/standings?sport=Basketball
router.get('/', async (req, res) => {
  try {
    const { sport } = req.query;

    const result = await query(`
      SELECT 
        t.code, t.name, t.color, t.logo_url,
        COUNT(*) as played,
        SUM(CASE WHEN f.winner_id = t.id THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN f.status = 'draw' THEN 1 ELSE 0 END) as drawn,
        SUM(CASE WHEN f.winner_id IS NOT NULL AND f.winner_id != t.id THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END) as pf,
        SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END) as pa,
        SUM(CASE 
          WHEN f.winner_id = t.id THEN 3 
          WHEN f.status = 'draw' THEN 1 
          ELSE 0 
        END) as points
      FROM fixtures f
      JOIN teams t ON t.id IN (f.team_a_id, f.team_b_id)
      JOIN sports s ON f.sport_id = s.id
      WHERE f.status IN ('completed', 'draw') AND s.name = $1 AND f.organization_id = $2
      GROUP BY t.id, t.code, t.name, t.color, t.logo_url
      ORDER BY points DESC, (SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END) - 
               SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END)) DESC
    `, [sport, req.orgId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/standings/log — Overall championship
router.get('/log', async (req, res) => {
  try {
    // Get per-sport rankings
    const sportsRes = await query("SELECT id, name FROM sports WHERE name != 'Athletics' AND organization_id = $1", [req.orgId]);
    const sports = sportsRes.rows;

    const teamPoints = {};
    const teamsRes = await query('SELECT id, code, name, color, logo_url FROM teams WHERE organization_id = $1', [req.orgId]);
    teamsRes.rows.forEach(t => {
      teamPoints[t.code] = { 
        code: t.code, name: t.name, color: t.color, logo_url: t.logo_url,
        BB: 0, VB: 0, SC: 0, TW: 0, AT: 0, NV: 0,
        total: 0, gold: 0, silver: 0, bronze: 0, medals: 0
      };
    });

    const pointMap = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1 };

    for (const sport of sports) {
      const standingsRes = await query(`
        SELECT t.code,
          COALESCE(SUM(CASE WHEN f.winner_id = t.id THEN 3 WHEN f.status = 'draw' THEN 1 ELSE 0 END), 0) as pts
        FROM teams t
        LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.sport_id = $1 AND f.status IN ('completed', 'draw') AND f.organization_id = $2
        WHERE t.organization_id = $2
        GROUP BY t.id, t.code
        ORDER BY pts DESC, t.code ASC
      `, [sport.id, req.orgId]);

      const key = sport.name === 'Basketball' ? 'BB' : 
                  sport.name === 'Volleyball' ? 'VB' : 
                  sport.name === 'Soccer' ? 'SC' : 
                  sport.name === 'Tug of War' ? 'TW' :
                  sport.name === 'Novelty' ? 'NV' : null;

      standingsRes.rows.forEach((row, idx) => {
        const rank = idx + 1;
        const pts = pointMap[rank] || 0;
        if (teamPoints[row.code]) {
          if (key) teamPoints[row.code][key] = pts;
          teamPoints[row.code].total += pts;
          if (rank === 1) teamPoints[row.code].gold++;
          if (rank === 2) teamPoints[row.code].silver++;
          if (rank === 3) teamPoints[row.code].bronze++;
          if (rank <= 3) teamPoints[row.code].medals++;
        }
      });
    }

    // Athletics: Dynamically sum up points from results
    const athStandingsRes = await query(`
      SELECT t.code, COALESCE(SUM(ar.points), 0) as total_pts
      FROM teams t
      LEFT JOIN athletics_results ar ON t.id = ar.team_id
      LEFT JOIN athletics_events ae ON ar.event_id = ae.id AND ae.organization_id = $1
      WHERE t.organization_id = $1
      GROUP BY t.id, t.code
      ORDER BY total_pts DESC, t.code ASC
    `, [req.orgId]);

    athStandingsRes.rows.forEach((row, idx) => {
      const rank = idx + 1;
      const pts = pointMap[rank] || 0;
      if (teamPoints[row.code]) {
        teamPoints[row.code].AT = pts;
        teamPoints[row.code].total += pts;
        if (rank === 1) teamPoints[row.code].gold++;
        if (rank === 2) teamPoints[row.code].silver++;
        if (rank === 3) teamPoints[row.code].bronze++;
        if (rank <= 3) teamPoints[row.code].medals++;
      }
    });

    const sorted = Object.values(teamPoints).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.medals - a.medals;
    });

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
