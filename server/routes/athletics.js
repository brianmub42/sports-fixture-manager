import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';
import { notifyPlacementResults, checkAndNotifyLeaderChange } from '../services/notificationService.js';

const router = Router();

// GET /api/athletics/sports
router.get('/sports', async (req, res) => {
  try {
    const result = await query('SELECT * FROM sports WHERE organization_id = $1 AND scoring_type = \'placement\'', [req.orgId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/athletics/events
router.get('/events', async (req, res) => {
  try {
    const eventsRes = await query(`
      SELECT ae.*, s.name as sport_name, v.name as venue_name
      FROM athletics_events ae
      JOIN sports s ON ae.sport_id = s.id
      LEFT JOIN venues v ON ae.venue_id = v.id
      WHERE ae.organization_id = $1
      ORDER BY ae.scheduled_at ASC
    `, [req.orgId]);

    const resultsRes = await query(`
      SELECT ar.*, t.code as team_code, t.name as team_name, t.logo_url as team_logo, t.color as team_color
      FROM athletics_results ar
      JOIN teams t ON ar.team_id = t.id
      JOIN athletics_events ae ON ar.event_id = ae.id
      WHERE ae.organization_id = $1
      ORDER BY ar.placement ASC
    `, [req.orgId]);

    const resultsByEvent = {};
    resultsRes.rows.forEach(r => {
      if (!resultsByEvent[r.event_id]) {
        resultsByEvent[r.event_id] = [];
      }
      resultsByEvent[r.event_id].push(r);
    });

    const events = eventsRes.rows.map(e => ({
      ...e,
      results: resultsByEvent[e.id] || []
    }));

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/athletics/events (Admin/Scorekeeper)
router.post('/events', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { name, category, sport_id, venue_id, scheduled_at, duration_minutes } = req.body;

    if (!name || !sport_id || !venue_id) {
      return res.status(400).json({ error: 'Name, sport_id, and venue_id are required' });
    }

    const result = await query(`
      INSERT INTO athletics_events (organization_id, sport_id, venue_id, name, category, scheduled_at, duration_minutes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.orgId, sport_id, venue_id, name, category, scheduled_at, duration_minutes || 4]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/athletics/events/:id (Admin/Scorekeeper)
router.put('/events/:id', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { name, category, sport_id, venue_id, scheduled_at, duration_minutes, status } = req.body;
    const eventId = req.params.id;

    if (!name || !sport_id || !venue_id) {
      return res.status(400).json({ error: 'Name, sport_id, and venue_id are required' });
    }

    const result = await query(`
      UPDATE athletics_events
      SET name = $1, category = $2, sport_id = $3, venue_id = $4, scheduled_at = $5, duration_minutes = $6, status = $7
      WHERE id = $8 AND organization_id = $9
      RETURNING *
    `, [name, category, sport_id, venue_id, scheduled_at, duration_minutes, status || 'upcoming', eventId, req.orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/athletics/events/:id (Admin/Scorekeeper)
router.delete('/events/:id', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;

    const result = await query(`
      DELETE FROM athletics_events
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [eventId, req.orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/athletics/events/:id/results
router.get('/events/:id/results', async (req, res) => {
  try {
    const eventId = req.params.id;

    const result = await query(`
      SELECT ar.*, t.code as team_code, t.name as team_name, t.logo_url as team_logo, t.color as team_color
      FROM athletics_results ar
      JOIN teams t ON ar.team_id = t.id
      JOIN athletics_events ae ON ar.event_id = ae.id
      WHERE ar.event_id = $1 AND ae.organization_id = $2
      ORDER BY ar.placement ASC
    `, [eventId, req.orgId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const pendingAthletics = new Map();

// POST /api/athletics/events/:id/results (Admin/Scorekeeper)
router.post('/events/:id/results', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  const { results } = req.body; // array of { teamId, placement, timeMs }
  const eventId = req.params.id;

  if (!Array.isArray(results)) {
    return res.status(400).json({ error: 'results (array) is required' });
  }

  // Hash / cache key of results placements array
  const key = `athletics:${eventId}:${JSON.stringify(results)}`;

  if (pendingAthletics.has(key)) {
    console.log('[Idempotency] Duplicate athletics results request, sharing promise for key:', key);
    try {
      const result = await pendingAthletics.get(key);
      return res.json(result);
    } catch (err) {
      const code = err.message === 'Event not found' ? 404 :
                   (err.message.includes('Points allocation') || err.message.includes('configured') ? 400 : 500);
      return res.status(code).json({ error: err.message });
    }
  }

  const promise = (async () => {
    // Verify event exists and belongs to organization
    const eventRes = await query('SELECT * FROM athletics_events WHERE id = $1 AND organization_id = $2', [eventId, req.orgId]);
    if (eventRes.rows.length === 0) {
      throw new Error('Event not found');
    }

    // Verify points allocation is configured in settings
    const pointsSettingRes = await query("SELECT value FROM settings WHERE organization_id = $1 AND key = 'points_allocation'", [req.orgId]);
    if (pointsSettingRes.rows.length === 0) {
      throw new Error('Points allocation has not been configured by the workspace administrator. Please configure it in Settings first.');
    }

    let pointMap = {};
    try {
      pointMap = JSON.parse(pointsSettingRes.rows[0].value);
    } catch (err) {
      throw new Error('Failed to parse points allocation configuration.');
    }

    // Delete existing results for this event
    await query('DELETE FROM athletics_results WHERE event_id = $1', [eventId]);

    // Insert new results
    for (const r of results) {
      let pts = null;
      if (pointMap[r.placement] !== undefined) {
        pts = Number(pointMap[r.placement]);
      } else if (pointMap[String(r.placement)] !== undefined) {
        pts = Number(pointMap[String(r.placement)]);
      }

      if (pts === null) {
        throw new Error(`Points allocation for Position ${r.placement} has not been configured in Settings. Please configure all necessary positions before logging results.`);
      }

      await query(`
        INSERT INTO athletics_results (event_id, team_id, placement, points, time_ms)
        VALUES ($1, $2, $3, $4, $5)
      `, [eventId, r.teamId, r.placement, pts, r.timeMs || null]);
    }

    // Update event status to completed
    await query('UPDATE athletics_events SET status = \'completed\' WHERE id = $1', [eventId]);

    // Format time helper (e.g. 11.42s or 1:24.50)
    const formatTime = (ms) => {
      if (ms == null) return null;
      const num = Number(ms);
      if (isNaN(num)) return null;
      if (num < 60000) {
        return `${(num / 1000).toFixed(2)}s`;
      }
      const totalSeconds = Math.floor(num / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hundredths = Math.floor((num % 1000) / 10);
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
    };

    // Fetch full event metadata & sport info
    const fullEventRes = await query(`
      SELECT ae.*, s.name as sport_name, s.scoring_type as scoring_type, v.name as venue_name
      FROM athletics_events ae
      JOIN sports s ON ae.sport_id = s.id
      LEFT JOIN venues v ON ae.venue_id = v.id
      WHERE ae.id = $1 AND ae.organization_id = $2
    `, [eventId, req.orgId]);
    const eventInfo = fullEventRes.rows[0] || eventRes.rows[0];

    // Fetch team results with team names, codes, colors
    const resultsDetailsRes = await query(`
      SELECT ar.*, t.code as team_code, t.name as team_name, t.logo_url as team_logo, t.color as team_color
      FROM athletics_results ar
      JOIN teams t ON ar.team_id = t.id
      WHERE ar.event_id = $1
      ORDER BY ar.placement ASC
    `, [eventId]);

    const formattedResults = resultsDetailsRes.rows.map(r => ({
      placement: r.placement,
      teamId: r.team_id,
      teamName: r.team_name,
      teamCode: r.team_code,
      teamColor: r.team_color,
      teamLogo: r.team_logo,
      points: r.points,
      timeMs: r.time_ms,
      timeFormatted: formatTime(r.time_ms)
    }));

    const latestResultPayload = {
      eventId: eventInfo.id,
      eventName: eventInfo.name,
      category: eventInfo.category,
      sportName: eventInfo.sport_name || 'Athletics',
      scoringType: eventInfo.scoring_type || 'placement',
      venueName: eventInfo.venue_name || 'Main Track',
      publishedAt: new Date().toISOString(),
      results: formattedResults
    };

    // Store in settings table for persistence across spectator page reloads
    try {
      await query(`
        INSERT INTO settings (organization_id, key, value)
        VALUES ($1, 'latest_event_result', $2)
        ON CONFLICT (organization_id, key)
        DO UPDATE SET value = $2
      `, [req.orgId, JSON.stringify(latestResultPayload)]);
    } catch (dbErr) {
      console.error('Failed to persist latest_event_result in settings:', dbErr);
    }

    // Broadcast update via Socket.io if available
    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('eventResultsPublished', latestResultPayload);
      if (req.orgSlug) {
        req.io.to(`tenant-${req.orgSlug}`).emit('eventResultsPublished', latestResultPayload);
      }
      req.io.to(`tenant-${req.orgId}`).emit('score-updated', { eventId, status: 'completed' });
    }

    // Invalidate standings cache on write
    try {
      const cacheKeys = await req.redisClient.keys(`leaderboard:${req.orgId}:*`);
      if (cacheKeys.length > 0) {
        await req.redisClient.del(cacheKeys);
        console.log(`[Cache Invalidation] Cleared ${cacheKeys.length} keys for tenant ${req.orgId}`);
      }
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }

    // Dispatch push notifications to followers
    notifyPlacementResults({
      orgId: req.orgId,
      orgSlug: req.orgSlug,
      eventInfo,
      results: formattedResults
    }).catch(err => console.error('[Push Service] Athletics results notification error:', err));

    checkAndNotifyLeaderChange({
      orgId: req.orgId,
      orgSlug: req.orgSlug
    }).catch(err => console.error('[Push Service] Leader check error:', err));

    return { success: true, message: 'Results saved successfully', latestResult: latestResultPayload };
  })();

  pendingAthletics.set(key, promise);

  try {
    const result = await promise;
    res.json(result);
  } catch (err) {
    const code = err.message === 'Event not found' ? 404 :
                 (err.message.includes('Points allocation') || err.message.includes('configured') ? 400 : 500);
    res.status(code).json({ error: err.message });
  } finally {
    // Automatically clean up the map entry after 10 seconds
    setTimeout(() => {
      pendingAthletics.delete(key);
    }, 10000);
  }
});

// GET /api/athletics/latest-result
router.get('/latest-result', async (req, res) => {
  try {
    const result = await query(
      "SELECT value FROM settings WHERE organization_id = $1 AND key = 'latest_event_result'",
      [req.orgId]
    );

    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.json({ latestResult: null });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(result.rows[0].value);
    } catch (err) {
      console.error('Error parsing latest_event_result JSON:', err);
    }

    res.json({ latestResult: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
