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

    const teamsCountRes = await query('SELECT count(*)::int as count FROM teams WHERE organization_id = $1', [req.orgId]);
    const sportsCountRes = await query('SELECT count(*)::int as count FROM sports WHERE organization_id = $1', [req.orgId]);
    const usersCountRes = await query('SELECT count(*)::int as count FROM users WHERE organization_id = $1', [req.orgId]);
    const hasUsers = usersCountRes.rows[0].count > 0;

    const orgName = settings.org_name || req.orgInfo.name;
    const eventTitle = settings.event_title || req.orgInfo.event_title;
    const enablePlayerRegistration = settings.enable_player_registration === 'true';

    // Fetch workspace billing info
    const billingRes = await query(
      'SELECT subscription_status, term_expires_at, credit_balance, pop_file_url, pop_uploaded_at, billing_school_name, billing_address FROM organizations WHERE id = $1',
      [req.orgId]
    );
    const orgBilling = billingRes.rows[0] || {};
    let status = orgBilling.subscription_status || 'active';
    const expiresAt = orgBilling.term_expires_at ? new Date(orgBilling.term_expires_at) : null;
    
    // Auto-suspend if expired
    if (status === 'active' && expiresAt && expiresAt < new Date()) {
      await query(
        "UPDATE organizations SET subscription_status = 'suspended' WHERE id = $1",
        [req.orgId]
      );
      status = 'suspended';
    }

    const minutesRemaining = expiresAt ? Math.round((expiresAt - new Date()) / 60000) : 999;
    const isLowCredit = status === 'suspended' || (expiresAt && minutesRemaining <= 10);

    // Parse sponsors JSON safely
    let sponsors = [];
    try { sponsors = settings.sponsors ? JSON.parse(settings.sponsors) : []; } catch {}

    // Parse points_allocation safely
    let pointsAllocation = null;
    try {
      if (settings.points_allocation) {
        pointsAllocation = JSON.parse(settings.points_allocation);
      }
    } catch (err) {
      console.error('Error parsing points_allocation:', err);
    }

    res.json({
      org_name: orgName,
      event_title: eventTitle,
      teams_count: teamsCountRes.rows[0].count,
      districts_count: teamsCountRes.rows[0].count, // backward compatibility
      sports_count: sportsCountRes.rows[0].count,
      sponsors,
      enable_player_registration: enablePlayerRegistration,
      points_allocation: pointsAllocation,
      billing: {
        status,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        minutes_remaining: minutesRemaining,
        is_low_credit: isLowCredit,
        credit_balance: orgBilling.credit_balance || 0.00,
        pop_file_url: orgBilling.pop_file_url,
        pop_uploaded_at: orgBilling.pop_uploaded_at ? new Date(orgBilling.pop_uploaded_at).toISOString() : null,
        billing_school_name: orgBilling.billing_school_name,
        billing_address: orgBilling.billing_address
      },
      has_users: hasUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { org_name, event_title, enable_player_registration, points_allocation } = req.body;
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
    if (enable_player_registration !== undefined) {
      await query(
        "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'enable_player_registration', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
        [req.orgId, enable_player_registration ? 'true' : 'false']
      );
    }
    if (points_allocation !== undefined) {
      const json = points_allocation ? JSON.stringify(points_allocation) : null;
      if (json) {
        await query(
          "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'points_allocation', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
          [req.orgId, json]
        );
      } else {
        await query(
          "DELETE FROM settings WHERE organization_id = $1 AND key = 'points_allocation'",
          [req.orgId]
        );
      }
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
      await query('DELETE FROM teams WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM sports WHERE organization_id = $1', [req.orgId]);
    } else if (type === 'results_only') {
      await query('DELETE FROM score_logs WHERE fixture_id IN (SELECT id FROM fixtures WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM player_stats WHERE fixture_id IN (SELECT id FROM fixtures WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM fixture_lineups WHERE fixture_id IN (SELECT id FROM fixtures WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM athletics_results WHERE event_id IN (SELECT id FROM athletics_events WHERE organization_id = $1)', [req.orgId]);
      await query('UPDATE fixtures SET score_a = NULL, score_b = NULL, status = \'upcoming\', winner_id = NULL WHERE organization_id = $1', [req.orgId]);
      await query('UPDATE athletics_events SET status = \'upcoming\' WHERE organization_id = $1', [req.orgId]);
    } else {
      await query('DELETE FROM score_logs WHERE fixture_id IN (SELECT id FROM fixtures WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM athletics_results WHERE event_id IN (SELECT id FROM athletics_events WHERE organization_id = $1)', [req.orgId]);
      await query('DELETE FROM fixtures WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM athletics_events WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM venues WHERE organization_id = $1', [req.orgId]);
      await query('DELETE FROM teams WHERE organization_id = $1', [req.orgId]);
    }

    res.json({ success: true, message: 'Database reset completed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/billing/request-invoice
router.post('/billing/request-invoice', authMiddleware, async (req, res) => {
  try {
    const { schoolName, billingAddress } = req.body;
    if (!schoolName) return res.status(400).json({ error: 'School/organization name is required' });

    await query(
      `UPDATE organizations 
       SET billing_school_name = $1, billing_address = $2 
       WHERE id = $3`,
      [schoolName, billingAddress || '', req.orgId]
    );

    res.json({ success: true, message: 'Invoice details saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/billing/simulate-expiry
router.post('/billing/simulate-expiry', authMiddleware, async (req, res) => {
  try {
    await query(
      `UPDATE organizations 
       SET term_expires_at = NOW() - INTERVAL '1 minute',
           subscription_status = 'suspended'
       WHERE id = $1`,
      [req.orgId]
    );
    res.json({ success: true, message: 'Workspace expired simulated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/billing/simulate-renewal
router.post('/billing/simulate-renewal', authMiddleware, async (req, res) => {
  try {
    await query(
      `UPDATE organizations 
       SET term_expires_at = NOW() + INTERVAL '14 days',
           subscription_status = 'active',
           pop_file_url = NULL,
           pop_uploaded_at = NULL
       WHERE id = $1`,
      [req.orgId]
    );
    res.json({ success: true, message: 'Workspace renewal simulated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
