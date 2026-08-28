import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/public/events/:eventSlug
// Returns basic event info: event title, school/tenant name, creation date, and houses/teams.
router.get('/events/:eventSlug', async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const orgRes = await query(
      'SELECT id, name, event_title, created_at FROM organizations WHERE slug = $1',
      [eventSlug]
    );
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: `Event not found: ${eventSlug}` });
    }
    const org = orgRes.rows[0];

    const teamsRes = await query(
      'SELECT id, code, name, color, logo_url FROM teams WHERE organization_id = $1 ORDER BY name ASC',
      [org.id]
    );

    const sportsRes = await query(
      'SELECT id, name, scoring_type FROM sports WHERE organization_id = $1 ORDER BY name ASC',
      [org.id]
    );

    res.json({
      name: org.event_title,
      school_name: org.name,
      created_at: org.created_at,
      teams: teamsRes.rows,
      sports: sportsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/events/:eventSlug/fixtures
// Returns fixture schedules for points-based and placement-based sports.
router.get('/events/:eventSlug/fixtures', async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { status, sport, team } = req.query;

    const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [eventSlug]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: `Event not found: ${eventSlug}` });
    }
    const orgId = orgRes.rows[0].id;

    let isPlacementSport = false;
    if (sport) {
      const spRes = await query('SELECT scoring_type FROM sports WHERE name = $1 AND organization_id = $2', [sport, orgId]);
      if (spRes.rows.length > 0 && spRes.rows[0].scoring_type === 'placement') {
        isPlacementSport = true;
      }
    }
    const isAllSports = !sport;

    let sqlParts = [];

    // 1. Build Fixtures Query (for points-based sports)
    if (isAllSports || (!isPlacementSport && sport)) {
      let fixturesSql = `
        SELECT f.id, f.sport_id, f.venue_id, f.scheduled_at, f.duration_minutes, f.status,
          a.name as team_a_name, a.code as team_a_code, a.color as team_a_color, a.logo_url as team_a_logo,
          b.name as team_b_name, b.code as team_b_code, b.color as team_b_color, b.logo_url as team_b_logo,
          f.score_a, f.score_b, f.winner_id, f.notes,
          v.name as venue_name, s.name as sport_name, s.scoring_type as scoring_type
        FROM fixtures f
        JOIN teams a ON f.team_a_id = a.id
        JOIN teams b ON f.team_b_id = b.id
        JOIN venues v ON f.venue_id = v.id
        JOIN sports s ON f.sport_id = s.id
        WHERE f.organization_id = $1
      `;
      const fParams = [orgId];
      let fIdx = 2;
      if (status) { fixturesSql += ` AND f.status = $${fIdx++}`; fParams.push(status); }
      if (sport) { fixturesSql += ` AND s.name = $${fIdx++}`; fParams.push(sport); }
      if (team) { fixturesSql += ` AND (a.code = $${fIdx} OR b.code = $${fIdx})`; fParams.push(team); }
      sqlParts.push({ sql: fixturesSql, params: fParams });
    }

    // 2. Build Athletics Events Query (for placement-based sports)
    if (isAllSports || isPlacementSport) {
      let athleticsSql = `
        SELECT 
          ae.id,
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
          v.name as venue_name,
          s.name as sport_name,
          s.scoring_type as scoring_type
        FROM athletics_events ae
        JOIN venues v ON ae.venue_id = v.id
        JOIN sports s ON ae.sport_id = s.id
        WHERE ae.organization_id = $1
      `;
      const aParams = [orgId];
      let aIdx = 2;
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
      if (team) {
        athleticsSql += ` AND EXISTS (
          SELECT 1 FROM athletics_results ar
          JOIN teams t2 ON ar.team_id = t2.id
          WHERE ar.event_id = ae.id AND t2.code = $${aIdx++}
        )`;
        aParams.push(team);
      }
      sqlParts.push({ sql: athleticsSql, params: aParams });
    }

    let finalRows = [];
    if (sqlParts.length === 1) {
      const queryRes = await query(sqlParts[0].sql + ' ORDER BY scheduled_at ASC', sqlParts[0].params);
      finalRows = queryRes.rows;
    } else {
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

// GET /api/public/events/:eventSlug/standings
// Returns aggregate overall championship standings, or sport standings if ?sport= parameter is defined.
router.get('/events/:eventSlug/standings', async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { sport, eventId } = req.query;

    const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [eventSlug]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: `Event not found: ${eventSlug}` });
    }
    const orgId = orgRes.rows[0].id;

    // 1. If a sport-specific filter is requested (and it is not 'overall' or 'championship'), resolve it
    if (sport && sport !== 'championship' && sport !== 'overall') {
      const cacheKey = `leaderboard:${orgId}:${sport.toLowerCase()}:${eventId || 'all'}`;
      try {
        const cached = await req.redisClient.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (err) {
        console.error('Redis cache get error:', err);
      }

      const sportRes = await query('SELECT * FROM sports WHERE name = $1 AND organization_id = $2', [sport, orgId]);
      const sportRow = sportRes.rows[0];
      if (!sportRow) return res.status(404).json({ error: 'Sport not found' });

      let standings = [];

      if (sportRow.scoring_type === 'placement') {
        if (eventId && eventId !== 'all') {
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
            LEFT JOIN athletics_events ae ON ar.event_id = ae.id AND ae.sport_id = $1 AND ae.organization_id = $2 AND ae.status = 'completed' AND ae.id = $3
            WHERE t.organization_id = $2
            GROUP BY t.id, t.code, t.name, t.color, t.logo_url
            ORDER BY points DESC, won DESC, gold DESC, silver DESC, bronze DESC, t.code ASC
          `, [sportRow.id, orgId, Number(eventId)]);

          standings = currentRes.rows.map(row => ({
            ...row,
            trend: 'same',
            rank_diff: 0,
            event_breakdown: []
          }));
        } else {
          // Current Placements Standings
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
          `, [sportRow.id, orgId]);

          const currentRows = currentRes.rows;

          // Previous Placements Standings
          const latestEventRes = await query(`
            SELECT id FROM athletics_events 
            WHERE sport_id = $1 AND organization_id = $2 AND status = 'completed'
            ORDER BY created_at DESC, id DESC LIMIT 1
          `, [sportRow.id, orgId]);

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
            `, [sportRow.id, orgId, latestEventId]);
            previousRows = prevRes.rows;
          } else {
            previousRows = currentRows;
          }

          // Fetch event breakdowns
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
          `, [sportRow.id, orgId]);

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

          standings = currentRows.map((row, idx) => {
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
        }
      } else {
        // scoring_type = 'points'
        const currentRes = await query(`
          SELECT 
            t.id, t.code, t.name, t.color, t.logo_url,
            COUNT(f.id)::int as played,
            SUM(CASE WHEN f.winner_id = t.id THEN 1 ELSE 0 END)::int as won,
            SUM(CASE WHEN f.status = 'draw' THEN 1 ELSE 0 END)::int as drawn,
            SUM(CASE WHEN f.status = 'completed' AND f.winner_id != t.id AND f.winner_id IS NOT NULL THEN 1 ELSE 0 END)::int as lost,
            SUM(CASE WHEN f.team_a_id = t.id THEN COALESCE(f.score_a, 0) ELSE COALESCE(f.score_b, 0) END)::int as pf,
            SUM(CASE WHEN f.team_a_id = t.id THEN COALESCE(f.score_b, 0) ELSE COALESCE(f.score_a, 0) END)::int as pa,
            SUM(CASE WHEN f.winner_id = t.id THEN s.win_points WHEN f.status = 'draw' THEN s.draw_points ELSE 0 END)::int as points
          FROM teams t
          LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.sport_id = $1 AND f.status IN ('completed', 'draw') AND f.organization_id = $2
          LEFT JOIN sports s ON f.sport_id = s.id
          WHERE t.organization_id = $2
          GROUP BY t.id, t.code, t.name, t.color, t.logo_url
          ORDER BY points DESC, won DESC, (SUM(CASE WHEN f.team_a_id = t.id THEN COALESCE(f.score_a, 0) ELSE COALESCE(f.score_b, 0) END) - SUM(CASE WHEN f.team_a_id = t.id THEN COALESCE(f.score_b, 0) ELSE COALESCE(f.score_a, 0) END)) DESC, t.code ASC
        `, [sportRow.id, orgId]);

        const currentRows = currentRes.rows;

        // Fetch latest completed fixture
        const latestFixtureRes = await query(`
          SELECT id FROM fixtures 
          WHERE sport_id = $1 AND status IN ('completed', 'draw') AND organization_id = $2
          ORDER BY updated_at DESC, id DESC LIMIT 1
        `, [sportRow.id, orgId]);

        let previousRows = [];
        if (latestFixtureRes.rows.length > 0) {
          const latestFixtureId = latestFixtureRes.rows[0].id;
          const prevRes = await query(`
            SELECT 
              t.code,
              SUM(CASE WHEN f.winner_id = t.id THEN s.win_points WHEN f.status = 'draw' THEN s.draw_points ELSE 0 END)::int as points,
              SUM(CASE WHEN f.winner_id = t.id THEN 1 ELSE 0 END)::int as won
            FROM teams t
            LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.sport_id = $1 AND f.status IN ('completed', 'draw') AND f.id != $3 AND f.organization_id = $2
            LEFT JOIN sports s ON f.sport_id = s.id
            WHERE t.organization_id = $2
            GROUP BY t.id, t.code
            ORDER BY points DESC, won DESC, t.code ASC
          `, [sportRow.id, orgId, latestFixtureId]);
          previousRows = prevRes.rows;
        } else {
          previousRows = currentRows;
        }

        const prevRankMap = {};
        previousRows.forEach((row, idx) => {
          prevRankMap[row.code] = idx + 1;
        });

        standings = currentRows.map((row, idx) => {
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
            event_breakdown: []
          };
        });
      }

      try {
        await req.redisClient.set(cacheKey, JSON.stringify(standings), { EX: 3 });
      } catch (err) {
        console.error('Redis cache set error:', err);
      }
      return res.json(standings);
    }

    // 2. Default: Calculate Overall Championship Standings (Log)
    const cacheKey = `leaderboard:${orgId}:championship`;
    try {
      const cached = await req.redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.error('Redis cache get error:', err);
    }

    const sportsRes = await query("SELECT id, name, scoring_type FROM sports WHERE organization_id = $1", [orgId]);
    const sports = sportsRes.rows;

    const teamPoints = {};
    const teamsRes = await query('SELECT id, code, name, color, logo_url FROM teams WHERE organization_id = $1', [orgId]);
    teamsRes.rows.forEach(t => {
      teamPoints[t.code] = { 
        code: t.code, name: t.name, color: t.color, logo_url: t.logo_url,
        BB: 0, VB: 0, SC: 0, TW: 0, AT: 0, NV: 0,
        total: 0, gold: 0, silver: 0, bronze: 0, medals: 0
      };
    });

    const pointsSettingRes = await query("SELECT value FROM settings WHERE organization_id = $1 AND key = 'points_allocation'", [orgId]);
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
      return 0;
    };

    for (const sport of sports) {
      let hasResults = false;
      if (sport.scoring_type !== 'placement') {
        const countRes = await query(
          "SELECT COUNT(*)::int as count FROM fixtures WHERE sport_id = $1 AND status IN ('completed', 'draw') AND organization_id = $2",
          [sport.id, orgId]
        );
        hasResults = countRes.rows[0].count > 0;
      } else {
        const countRes = await query(
          "SELECT COUNT(*)::int as count FROM athletics_events WHERE sport_id = $1 AND status = 'completed' AND organization_id = $2",
          [sport.id, orgId]
        );
        hasResults = countRes.rows[0].count > 0;
      }

      if (!hasResults) continue;

      let standingsRes;
      if (sport.scoring_type !== 'placement') {
        standingsRes = await query(`
          SELECT t.code,
            COALESCE(SUM(CASE WHEN f.winner_id = t.id THEN s.win_points WHEN f.status = 'draw' THEN s.draw_points ELSE 0 END), 0) as pts
          FROM teams t
          LEFT JOIN fixtures f ON t.id IN (f.team_a_id, f.team_b_id) AND f.sport_id = $1 AND f.status IN ('completed', 'draw') AND f.organization_id = $2
          LEFT JOIN sports s ON f.sport_id = s.id
          WHERE t.organization_id = $2
          GROUP BY t.id, t.code
          ORDER BY pts DESC, t.code ASC
        `, [sport.id, orgId]);
      } else {
        standingsRes = await query(`
          SELECT t.code, COALESCE(SUM(ar.points), 0) as pts
          FROM teams t
          LEFT JOIN athletics_results ar ON t.id = ar.team_id
          LEFT JOIN athletics_events ae ON ar.event_id = ae.id AND ae.sport_id = $1 AND ae.organization_id = $2
          WHERE t.organization_id = $2
          GROUP BY t.id, t.code
          ORDER BY pts DESC, t.code ASC
        `, [sport.id, orgId]);
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

    try {
      await req.redisClient.set(cacheKey, JSON.stringify(sorted), { EX: 3 });
    } catch (err) {
      console.error('Redis cache set error:', err);
    }
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
