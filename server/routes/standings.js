import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/standings?sport=Basketball
router.get('/', async (req, res) => {
  try {
    const { sport } = req.query;
    if (!sport) {
      return res.status(400).json({ error: 'Sport parameter is required' });
    }

    const sportRes = await query('SELECT * FROM sports WHERE name = $1 AND organization_id = $2', [sport, req.orgId]);
    const sportRow = sportRes.rows[0];
    if (!sportRow) return res.status(404).json({ error: 'Sport not found' });

    if (sportRow.scoring_type === 'placement') {
      // 1. Current Placements Standings
      const currentRes = await query(`
        SELECT 
          t.id, t.code, t.name, t.color, t.logo_url,
          COUNT(DISTINCT ae.id)::int as played,
          COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as won,
          COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as gold,
          COALESCE(SUM(CASE WHEN ar.placement = 2 THEN 1 ELSE 0 END), 0)::int as silver,
          COALESCE(SUM(CASE WHEN ar.placement = 3 THEN 1 ELSE 0 END), 0)::int as bronze,
          0 as drawn,
          0 as lost,
          0 as pf,
          0 as pa,
          COALESCE(SUM(ar.points), 0)::int as points
        FROM teams t
        LEFT JOIN athletics_results ar ON t.id = ar.team_id
        LEFT JOIN athletics_events ae ON ar.event_id = ae.id AND ae.sport_id = $1 AND ae.organization_id = $2 AND ae.status = 'completed'
        WHERE t.organization_id = $2
        GROUP BY t.id, t.code, t.name, t.color, t.logo_url
        ORDER BY points DESC, won DESC, gold DESC, silver DESC, bronze DESC, t.code ASC
      `, [sportRow.id, req.orgId]);

      const currentRows = currentRes.rows;

      // 2. Previous Placements Standings (excluding the latest completed event)
      const latestEventRes = await query(`
        SELECT id FROM athletics_events 
        WHERE sport_id = $1 AND organization_id = $2 AND status = 'completed'
        ORDER BY created_at DESC, id DESC LIMIT 1
      `, [sportRow.id, req.orgId]);

      let previousRows = [];
      if (latestEventRes.rows.length > 0) {
        const latestEventId = latestEventRes.rows[0].id;
        const prevRes = await query(`
          SELECT 
            t.code,
            COALESCE(SUM(ar.points), 0)::int as points,
            COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as won,
            COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as gold,
            COALESCE(SUM(CASE WHEN ar.placement = 2 THEN 1 ELSE 0 END), 0)::int as silver,
            COALESCE(SUM(CASE WHEN ar.placement = 3 THEN 1 ELSE 0 END), 0)::int as bronze
          FROM teams t
          LEFT JOIN athletics_results ar ON t.id = ar.team_id AND ar.event_id != $3
          LEFT JOIN athletics_events ae ON ar.event_id = ae.id AND ae.sport_id = $1 AND ae.organization_id = $2 AND ae.status = 'completed'
          WHERE t.organization_id = $2
          GROUP BY t.id, t.code
          ORDER BY points DESC, won DESC, gold DESC, silver DESC, bronze DESC, t.code ASC
        `, [sportRow.id, req.orgId, latestEventId]);
        previousRows = prevRes.rows;
      } else {
        previousRows = currentRows;
      }

      // 3. Fetch event breakdowns for placement events
      const breakdownRes = await query(`
        SELECT 
          ar.team_id,
          ae.name as event_name,
          ar.placement,
          ar.points
        FROM athletics_results ar
        JOIN athletics_events ae ON ar.event_id = ae.id
        WHERE ae.sport_id = $1 AND ae.organization_id = $2 AND ae.status = 'completed'
        ORDER BY ae.name ASC
      `, [sportRow.id, req.orgId]);

      const breakdownMap = {};
      breakdownRes.rows.forEach(row => {
        if (!breakdownMap[row.team_id]) {
          breakdownMap[row.team_id] = [];
        }
        breakdownMap[row.team_id].push({
          event_name: row.event_name,
          placement: row.placement,
          points: row.points
        });
      });

      const prevRankMap = {};
      previousRows.forEach((row, idx) => {
        prevRankMap[row.code] = idx + 1;
      });

      const standings = currentRows.map((row, idx) => {
        const currentRank = idx + 1;
        const prevRank = prevRankMap[row.code] || currentRank;
        const rankDiff = prevRank - currentRank;
        let trend = 'same';
        if (rankDiff > 0) trend = 'up';
        if (rankDiff < 0) trend = 'down';

        return {
          ...row,
          trend,
          rank_diff: rankDiff,
          event_breakdown: breakdownMap[row.id] || []
        };
      });

      return res.json(standings);
    }

    // scoring_type = 'points'
    // 1. Current Points Standings
    const currentRes = await query(`
      SELECT 
        t.id, t.code, t.name, t.color, t.logo_url,
        COUNT(f.id)::int as played,
        SUM(CASE WHEN f.winner_id = t.id THEN 1 ELSE 0 END)::int as won,
        SUM(CASE WHEN f.status = 'draw' THEN 1 ELSE 0 END)::int as drawn,
        SUM(CASE WHEN f.winner_id IS NOT NULL AND f.winner_id != t.id THEN 1 ELSE 0 END)::int as lost,
        COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END), 0)::int as pf,
        COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END), 0)::int as pa,
        COALESCE(SUM(CASE 
          WHEN f.winner_id = t.id THEN s.win_points 
          WHEN f.status = 'draw' THEN s.draw_points 
          ELSE 0 
        END), 0)::int as points
      FROM teams t
      LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.status IN ('completed', 'draw') AND f.organization_id = $2 AND f.sport_id = $3
      LEFT JOIN sports s ON f.sport_id = s.id
      WHERE t.organization_id = $2
      GROUP BY t.id, t.code, t.name, t.color, t.logo_url
      ORDER BY points DESC, (COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END), 0) - 
               COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END), 0)) DESC, t.code ASC
    `, [sport, req.orgId, sportRow.id]);

    const currentRows = currentRes.rows;

    // 2. Previous Points Standings (excluding the latest updated completed fixture)
    const latestFixtureRes = await query(`
      SELECT f.id FROM fixtures f
      WHERE f.sport_id = $1 AND f.organization_id = $2 AND f.status IN ('completed', 'draw')
      ORDER BY f.updated_at DESC, f.id DESC LIMIT 1
    `, [sportRow.id, req.orgId]);

    let previousRows = [];
    if (latestFixtureRes.rows.length > 0) {
      const latestFixtureId = latestFixtureRes.rows[0].id;
      const prevRes = await query(`
        SELECT 
          t.code,
          COALESCE(SUM(CASE 
            WHEN f.winner_id = t.id THEN s.win_points 
            WHEN f.status = 'draw' THEN s.draw_points 
            ELSE 0 
          END), 0)::int as points,
          (COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END), 0) - 
           COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END), 0))::int as diff
        FROM teams t
        LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.status IN ('completed', 'draw') AND f.organization_id = $2 AND f.id != $3 AND f.sport_id = $1
        LEFT JOIN sports s ON f.sport_id = s.id
        WHERE t.organization_id = $2
        GROUP BY t.id, t.code
        ORDER BY points DESC, diff DESC, t.code ASC
      `, [sportRow.id, req.orgId, latestFixtureId]);
      previousRows = prevRes.rows;
    } else {
      previousRows = currentRows;
    }

    const prevRankMap = {};
    previousRows.forEach((row, idx) => {
      prevRankMap[row.code] = idx + 1;
    });

    const standings = currentRows.map((row, idx) => {
      const currentRank = idx + 1;
      const prevRank = prevRankMap[row.code] || currentRank;
      const rankDiff = prevRank - currentRank;
      let trend = 'same';
      if (rankDiff > 0) trend = 'up';
      if (rankDiff < 0) trend = 'down';

      return {
        ...row,
        trend,
        rank_diff: rankDiff
      };
    });

    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/standings/log — Overall championship
router.get('/log', async (req, res) => {
  try {
    // Get all sports
    const sportsRes = await query("SELECT id, name, scoring_type FROM sports WHERE organization_id = $1", [req.orgId]);
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

    // Retrieve configured points allocation from settings
    const pointsSettingRes = await query("SELECT value FROM settings WHERE organization_id = $1 AND key = 'points_allocation'", [req.orgId]);
    let pointMap = null;
    if (pointsSettingRes.rows.length > 0) {
      try {
        pointMap = JSON.parse(pointsSettingRes.rows[0].value);
      } catch (err) {
        console.error('Error parsing points_allocation setting:', err);
      }
    }

    const getPointsForPlacement = (placement, map) => {
      if (!map) return 0;
      if (map[placement] !== undefined) return Number(map[placement]);
      if (map[String(placement)] !== undefined) return Number(map[String(placement)]);
      return 0; // Default to 0 points if not configured
    };

    for (const sport of sports) {
      let hasResults = false;
      if (sport.scoring_type === 'points') {
        const countRes = await query(
          "SELECT COUNT(*)::int as count FROM fixtures WHERE sport_id = $1 AND status IN ('completed', 'draw') AND organization_id = $2",
          [sport.id, req.orgId]
        );
        hasResults = countRes.rows[0].count > 0;
      } else {
        const countRes = await query(
          "SELECT COUNT(*)::int as count FROM athletics_events WHERE sport_id = $1 AND status = 'completed' AND organization_id = $2",
          [sport.id, req.orgId]
        );
        hasResults = countRes.rows[0].count > 0;
      }

      if (!hasResults) {
        continue;
      }

      let standingsRes;
      if (sport.scoring_type === 'points') {
        standingsRes = await query(`
          SELECT t.code,
            COALESCE(SUM(CASE WHEN f.winner_id = t.id THEN s.win_points WHEN f.status = 'draw' THEN s.draw_points ELSE 0 END), 0) as pts
          FROM teams t
          LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.sport_id = $1 AND f.status IN ('completed', 'draw') AND f.organization_id = $2
          LEFT JOIN sports s ON f.sport_id = s.id
          WHERE t.organization_id = $2
          GROUP BY t.id, t.code
          ORDER BY pts DESC, t.code ASC
        `, [sport.id, req.orgId]);
      } else {
        // Placement-based sport (e.g. Athletics, Novelty)
        standingsRes = await query(`
          SELECT t.code, COALESCE(SUM(ar.points), 0) as pts
          FROM teams t
          LEFT JOIN athletics_results ar ON t.id = ar.team_id
          LEFT JOIN athletics_events ae ON ar.event_id = ae.id AND ae.sport_id = $1 AND ae.organization_id = $2
          WHERE t.organization_id = $2
          GROUP BY t.id, t.code
          ORDER BY pts DESC, t.code ASC
        `, [sport.id, req.orgId]);
      }

      const key = sport.name === 'Basketball' ? 'BB' : 
                  sport.name === 'Volleyball' ? 'VB' : 
                  sport.name === 'Soccer' ? 'SC' : 
                  sport.name === 'Tug of War' ? 'TW' :
                  sport.name === 'Athletics' ? 'AT' :
                  sport.name === 'Novelty' ? 'NV' : null;

      standingsRes.rows.forEach((row, idx) => {
        const rank = idx + 1;
        const pts = getPointsForPlacement(rank, pointMap);
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
