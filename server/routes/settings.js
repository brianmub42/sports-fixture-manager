import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settingsRes = await query('SELECT key, value FROM settings WHERE organization_id = $1', [req.orgId]);
    const settings = {};
    settingsRes.rows.forEach(r => {
      settings[r.key] = r.value;
    });

    const districtsCountRes = await query('SELECT count(*)::int as count FROM districts WHERE organization_id = $1', [req.orgId]);
    const sportsCountRes = await query('SELECT count(*)::int as count FROM sports WHERE organization_id = $1', [req.orgId]);

    const orgName = settings.org_name || req.orgInfo.name;
    const eventTitle = settings.event_title || req.orgInfo.event_title;

    // Parse sponsors JSON safely
    let sponsors = [];
    try { sponsors = settings.sponsors ? JSON.parse(settings.sponsors) : []; } catch {}

    res.json({
      org_name: orgName,
      event_title: eventTitle,
      districts_count: districtsCountRes.rows[0].count,
      sports_count: sportsCountRes.rows[0].count,
      sponsors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { org_name, event_title } = req.body;
    if (org_name !== undefined) {
      await query(
        "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
        [req.orgId, org_name]
      );
      await query("UPDATE organizations SET name = $1 WHERE id = $2", [org_name, req.orgId]);
    }
    if (event_title !== undefined) {
      await query(
        "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'event_title', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
        [req.orgId, event_title]
      );
      await query("UPDATE organizations SET event_title = $1 WHERE id = $2", [event_title, req.orgId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/sponsors — save full sponsors list as JSON
router.post('/sponsors', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { sponsors } = req.body; // array of { name, logoUrl, website }
    if (!Array.isArray(sponsors)) return res.status(400).json({ error: 'sponsors must be an array' });
    const json = JSON.stringify(sponsors);
    await query(
      "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'sponsors', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
      [req.orgId, json]
    );
    res.json({ success: true, sponsors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/reset
router.post('/reset', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'fixtures_only' or 'full'

    if (type === 'full') {
      await query('DELETE FROM score_logs WHERE fixture_id IN (SELECT id FROM fixtures WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM athletics_results WHERE event_id IN (SELECT id FROM athletics_events WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM fixtures WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM athletics_events WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM venues WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM districts WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM sports WHERE organization_id = $1', [req.orgId]);
    } else {
      await query('DELETE FROM score_logs WHERE fixture_id IN (SELECT id FROM fixtures WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM athletics_results WHERE event_id IN (SELECT id FROM athletics_events WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM fixtures WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM athletics_events WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM venues WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM districts WHERE organization_id = $1', [req.orgId]);
    }

    res.json({ success: true, message: 'Database reset completed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
