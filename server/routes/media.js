import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireMediaOrAdmin } from '../middleware/auth.js';

const router = Router();

// ==========================================
// 1. TV ADVERTS (CRUD)
// ==========================================

// GET /api/media/adverts
// Returns active (or all) adverts for current organization
router.get('/adverts', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    let sql = 'SELECT * FROM tv_adverts WHERE organization_id = $1';
    const params = [req.orgId];

    if (activeOnly === 'true') {
      sql += ' AND is_active = true';
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/adverts (Admin or Media Manager)
router.post('/adverts', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const {
      title,
      tagline,
      banner_url,
      logo_url,
      website_url,
      display_duration_seconds = 10,
      display_type = 'both',
      is_active = true,
      sort_order = 0
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const duration = parseInt(display_duration_seconds, 10) || 10;

    const result = await query(
      `INSERT INTO tv_adverts 
       (organization_id, title, tagline, banner_url, logo_url, website_url, display_duration_seconds, display_type, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.orgId,
        title.trim(),
        tagline ? tagline.trim() : null,
        banner_url || null,
        logo_url || null,
        website_url ? website_url.trim() : null,
        Math.max(3, Math.min(60, duration)),
        display_type || 'both',
        is_active ?? true,
        parseInt(sort_order, 10) || 0
      ]
    );

    const advert = result.rows[0];

    // Broadcast update to all active TV screens
    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('tv-adverts-updated', { action: 'create', advert });
    }

    res.status(201).json(advert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/media/adverts/:id (Admin or Media Manager)
router.put('/adverts/:id', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      tagline,
      banner_url,
      logo_url,
      website_url,
      display_duration_seconds,
      display_type,
      is_active,
      sort_order
    } = req.body;

    // Verify ownership
    const check = await query('SELECT * FROM tv_adverts WHERE id = $1 AND organization_id = $2', [id, req.orgId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Advert not found' });
    }

    const current = check.rows[0];
    const duration = display_duration_seconds !== undefined
      ? Math.max(3, Math.min(60, parseInt(display_duration_seconds, 10) || 10))
      : current.display_duration_seconds;

    const result = await query(
      `UPDATE tv_adverts
       SET title = $1, tagline = $2, banner_url = $3, logo_url = $4, website_url = $5,
           display_duration_seconds = $6, display_type = $7, is_active = $8, sort_order = $9
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [
        title !== undefined ? title.trim() : current.title,
        tagline !== undefined ? (tagline ? tagline.trim() : null) : current.tagline,
        banner_url !== undefined ? banner_url : current.banner_url,
        logo_url !== undefined ? logo_url : current.logo_url,
        website_url !== undefined ? (website_url ? website_url.trim() : null) : current.website_url,
        duration,
        display_type !== undefined ? display_type : current.display_type,
        is_active !== undefined ? is_active : current.is_active,
        sort_order !== undefined ? parseInt(sort_order, 10) || 0 : current.sort_order,
        id,
        req.orgId
      ]
    );

    const updated = result.rows[0];

    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('tv-adverts-updated', { action: 'update', advert: updated });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/media/adverts/:id (Admin or Media Manager)
router.delete('/adverts/:id', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM tv_adverts WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, req.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advert not found' });
    }

    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('tv-adverts-updated', { action: 'delete', advertId: id });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. TV ANNOUNCEMENTS (Live Push)
// ==========================================

// GET /api/media/announcements
router.get('/announcements', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    let sql = 'SELECT * FROM tv_announcements WHERE organization_id = $1';
    const params = [req.orgId];

    if (activeOnly === 'true') {
      sql += ' AND is_active = true';
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/announcements (Admin or Media Manager - Live Push)
router.post('/announcements', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const {
      title,
      message,
      priority = 'normal', // 'normal' (ticker only) or 'urgent' (fullscreen banner overlay)
      display_duration_seconds = 15,
      is_active = true
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Announcement message is required' });
    }

    const duration = Math.max(5, Math.min(120, parseInt(display_duration_seconds, 10) || 15));

    const result = await query(
      `INSERT INTO tv_announcements
       (organization_id, title, message, priority, display_duration_seconds, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.orgId,
        title ? title.trim() : null,
        message.trim(),
        priority || 'normal',
        duration,
        is_active ?? true
      ]
    );

    const announcement = result.rows[0];

    // Emit live push to TV screens immediately
    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('tv-announcement', announcement);
    }

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/media/announcements/:id
router.delete('/announcements/:id', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM tv_announcements WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, req.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('tv-announcement-dismissed', { id });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ADMIN / MEDIA TV LAYOUT OVERRIDE
// ==========================================

// POST /api/media/tv-layout-override
// Body: { mode: 'auto' | 'force_showcase' | 'force_live' }
router.post('/tv-layout-override', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['auto', 'force_showcase', 'force_live'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be auto, force_showcase, or force_live' });
    }

    await query(
      `INSERT INTO settings (organization_id, key, value) 
       VALUES ($1, 'tv_layout_mode', $2) 
       ON CONFLICT (organization_id, key) DO UPDATE SET value = $2`,
      [req.orgId, mode]
    );

    // Instant socket broadcast to all connected TV screens
    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('tv-layout-override', { mode });
    }

    res.json({ success: true, mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. FORCE COMPLETE STALE FIXTURE (Admin / Media Override)
// ==========================================

// POST /api/media/force-complete-fixture/:id
router.post('/force-complete-fixture/:id', authMiddleware, requireMediaOrAdmin, async (req, res) => {
  try {
    const fixtureId = req.params.id;
    const fixCheck = await query('SELECT * FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    if (fixCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const fixture = fixCheck.rows[0];
    const scoreA = fixture.score_a !== null ? fixture.score_a : 0;
    const scoreB = fixture.score_b !== null ? fixture.score_b : 0;
    let status = 'completed';
    let winnerId = null;

    if (fixture.scoring_type !== 'placement') {
      if (scoreA > scoreB) winnerId = fixture.team_a_id;
      else if (scoreB > scoreA) winnerId = fixture.team_b_id;
      else status = 'draw';
    }

    const result = await query(
      `UPDATE fixtures
       SET status = $1, score_a = $2, score_b = $3, winner_id = $4,
           submitted_at = NOW(), submitted_by = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [status, scoreA, scoreB, winnerId, `${req.user.name || 'Admin'} (Override)`, fixtureId, req.orgId]
    );

    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('score-updated', {
        fixtureId,
        score_a: scoreA,
        score_b: scoreB,
        winner_id: winnerId,
        status
      });
      req.io.to(`tenant-${req.orgId}`).emit('fixture-updated', result.rows[0]);
    }

    // Invalidate standings cache on match completion
    try {
      if (req.redisClient?.keys) {
        const cacheKeys = await req.redisClient.keys(`leaderboard:${req.orgId}:*`);
        if (cacheKeys.length > 0) {
          await req.redisClient.del(cacheKeys);
          console.log(`[Cache Invalidation] Cleared ${cacheKeys.length} keys for tenant ${req.orgId}`);
        }
      }
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }

    res.json({ success: true, fixture: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
