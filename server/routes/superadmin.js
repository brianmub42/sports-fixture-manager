import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireSuperadmin } from '../middleware/auth.js';
import { checkBillingReminders } from '../lib/billing-scheduler.js';

const router = Router();

// Apply auth middleware and requireSuperadmin check globally to all sub-routes
router.use(authMiddleware);
router.use(requireSuperadmin);

// GET /api/superadmin/tenants
// Fetch list of all workspaces with billing status and metadata
router.get('/tenants', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        slug, 
        event_title, 
        creator_email, 
        subscription_status, 
        term_expires_at, 
        pop_file_url, 
        pop_uploaded_at, 
        billing_school_name, 
        billing_address, 
        billing_contact_person, 
        billing_contact_number, 
        created_at 
      FROM organizations 
      ORDER BY created_at DESC
    `);
    
    // Process minutes remaining for each organization
    const tenants = result.rows.map(org => {
      const expiresAt = org.term_expires_at ? new Date(org.term_expires_at) : null;
      const minutesRemaining = expiresAt ? Math.round((expiresAt - new Date()) / 60000) : 0;
      return {
        ...org,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        minutes_remaining: minutesRemaining
      };
    });

    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/approve
// Approves proof of payment and sets license active (expires in 120 days by default)
router.post('/tenants/:id/approve', async (req, res) => {
  try {
    const orgId = req.params.id;
    const { days } = req.body;
    const extensionDays = days ? parseInt(days) : 120; // Default term: 120 days

    await query(
      `UPDATE organizations 
       SET subscription_status = 'active', 
           term_expires_at = NOW() + ($1 * INTERVAL '1 day') 
       WHERE id = $2`,
      [extensionDays, orgId]
    );

    res.json({ success: true, message: `Workspace license approved for ${extensionDays} days` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/suspend
// Suspends a workspace license
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const orgId = req.params.id;

    await query(
      `UPDATE organizations 
       SET subscription_status = 'suspended' 
       WHERE id = $1`,
      [orgId]
    );

    res.json({ success: true, message: 'Workspace license suspended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/extend
// Sets a custom license expiration date
router.post('/tenants/:id/extend', async (req, res) => {
  try {
    const orgId = req.params.id;
    const { expiresAt } = req.body; // expected ISO string or YYYY-MM-DD
    if (!expiresAt) {
      return res.status(400).json({ error: 'Expiration date is required' });
    }

    await query(
      `UPDATE organizations 
       SET subscription_status = 'active', 
           term_expires_at = $1 
       WHERE id = $2`,
      [expiresAt, orgId]
    );

    res.json({ success: true, message: 'Workspace expiration updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/billing/run-reminder-check
// Manually triggers the daily billing reminder logic for testing
router.post('/billing/run-reminder-check', async (req, res) => {
  try {
    const results = await checkBillingReminders();
    res.json({ success: true, triggeredReminders: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
